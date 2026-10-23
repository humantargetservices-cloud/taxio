-- TAXIO staging-only two-sided trip closure; no changes to booking/rescue timers.
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS completion_confirmation_status text,
  ADD COLUMN IF NOT EXISTS completion_response_at timestamptz;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='booking_requests_completion_confirmation_status_check') THEN
    ALTER TABLE public.booking_requests ADD CONSTRAINT booking_requests_completion_confirmation_status_check
    CHECK (completion_confirmation_status IS NULL OR completion_confirmation_status IN
      ('AWAITING_PASSENGER','PASSENGER_CONFIRMED','ISSUE_REPORTED','CLOSED_UNCONFIRMED'));
  END IF;
END $$;
-- New completions get awaiting status atomically with existing RPC; historical rows stay NULL.
CREATE OR REPLACE FUNCTION public.taxio_set_completion_pending()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL AND NEW.completion_confirmation_status IS NULL THEN
    NEW.completion_confirmation_status := 'AWAITING_PASSENGER';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_taxio_set_completion_pending ON public.booking_requests;
CREATE TRIGGER trg_taxio_set_completion_pending BEFORE UPDATE OF completed_at
ON public.booking_requests FOR EACH ROW EXECUTE FUNCTION public.taxio_set_completion_pending();
-- Invoked only from server authenticated by an opaque high-entropy trip token.
CREATE OR REPLACE FUNCTION public.taxio_passenger_finish_trip(p_token text,p_action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.booking_requests%ROWTYPE; v_status text;
BEGIN
  IF p_token IS NULL OR length(p_token)<20 OR p_action NOT IN ('CONFIRM','ISSUE') THEN
    RETURN jsonb_build_object('ok',false,'code','INVALID_INPUT');
  END IF;
  SELECT * INTO b FROM public.booking_requests WHERE passenger_trip_token=p_token FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'code','NOT_FOUND'); END IF;
  IF b.completed_at IS NULL THEN RETURN jsonb_build_object('ok',false,'code','NOT_FINISHED'); END IF;
  v_status := COALESCE(b.completion_confirmation_status,'PASSENGER_CONFIRMED');
  IF v_status='AWAITING_PASSENGER' AND b.completed_at<=now()-interval '24 hours' THEN
    UPDATE public.booking_requests SET completion_confirmation_status='CLOSED_UNCONFIRMED',completion_response_at=now()
    WHERE id=b.id;
    RETURN jsonb_build_object('ok',false,'code','WINDOW_CLOSED');
  END IF;
  IF v_status<>'AWAITING_PASSENGER' THEN
    RETURN jsonb_build_object('ok',false,'code','ALREADY_RESOLVED','status',v_status);
  END IF;
  v_status:=CASE p_action WHEN 'CONFIRM' THEN 'PASSENGER_CONFIRMED' ELSE 'ISSUE_REPORTED' END;
  UPDATE public.booking_requests SET completion_confirmation_status=v_status,completion_response_at=now() WHERE id=b.id;
  RETURN jsonb_build_object('ok',true,'status',v_status);
END $$;
REVOKE ALL ON FUNCTION public.taxio_passenger_finish_trip(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.taxio_passenger_finish_trip(text,text) TO service_role;
