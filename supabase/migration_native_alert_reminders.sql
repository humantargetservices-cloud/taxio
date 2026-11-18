-- One send-once driver reminder at roughly 25 seconds remaining.
-- Reuses company_push_outbox. Web Push receives the reminder as fallback.
-- Native dispatcher targets iOS reminders only because Android already loops.
create or replace function public.taxio_rescue_process_timeouts()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_booking record;
  v_act jsonb;
  v_auto_activated int := 0;
  v_opp_withdrawn int := 0;
  v_rescues_expired int := 0;
  v_passenger_expired int := 0;
  v_reminders_due int := 0;
  v_native_booking_reminders int := 0;
  v_native_rescue_reminders int := 0;
  r_id uuid;
  open_left int;
begin
  for v_booking in
    select b.id from public.booking_requests b
    where b.status='new' and b.decision_deadline_at is not null
      and b.decision_deadline_at <= now()
      and not exists(select 1 from public.rescue_requests rr where rr.booking_request_id=b.id)
    order by b.decision_deadline_at limit 50
  loop
    v_act := public.taxio_rescue_auto_activate_booking(v_booking.id);
    if v_act ? 'ok' and (v_act->>'ok')::boolean then v_auto_activated:=v_auto_activated+1; end if;
  end loop;

  update public.rescue_opportunities o
  set status='WITHDRAWN', responded_at=coalesce(o.responded_at,now())
  where o.status='OFFERED' and o.expires_at is not null and o.expires_at <= now();
  get diagnostics v_opp_withdrawn = row_count;

  for r_id in select rr.id from public.rescue_requests rr where rr.status='OPEN'
  loop
    select count(*) into open_left from public.rescue_opportunities
    where rescue_request_id=r_id and status='OFFERED';
    if open_left=0 then
      update public.rescue_requests set status='EXPIRED',closed_at=now()
      where id=r_id and status='OPEN';
      if found then v_rescues_expired:=v_rescues_expired+1; end if;
    end if;
  end loop;

  update public.rescue_requests
  set passenger_confirm_status='EXPIRED',closed_at=coalesce(closed_at,now())
  where status='ACCEPTED' and passenger_confirm_status='WAITING_PASSENGER_CONFIRMATION'
    and passenger_confirm_deadline_at is not null and passenger_confirm_deadline_at <= now();
  get diagnostics v_passenger_expired = row_count;

  select count(*)::int into v_reminders_due from public.rescue_requests rr
  where rr.status='ACCEPTED' and rr.passenger_confirm_status='WAITING_PASSENGER_CONFIRMATION'
    and rr.passenger_confirm_reminder_whatsapp_sent_at is null and rr.accepted_at is not null
    and rr.accepted_at + interval '20 minutes' <= now()
    and (rr.passenger_confirm_deadline_at is null or rr.passenger_confirm_deadline_at > now());

  insert into public.company_push_outbox(company_id,event_type,booking_id,dedupe_key)
  select b.company_id,'COMPANY_BOOKING_NEW',b.id,'booking-reminder:'||b.id::text
  from public.booking_requests b
  where b.status='new' and b.decision_deadline_at is not null
    and b.decision_deadline_at > now()
    and b.decision_deadline_at <= now()+interval '25 seconds'
  on conflict(dedupe_key) do nothing;
  get diagnostics v_native_booking_reminders = row_count;

  insert into public.company_push_outbox(company_id,event_type,rescue_request_id,rescue_opportunity_id,dedupe_key)
  select o.company_id,'RESCUE_OPPORTUNITY_NEW',o.rescue_request_id,o.id,'rescue-reminder:'||o.id::text
  from public.rescue_opportunities o
  join public.rescue_requests rr on rr.id=o.rescue_request_id
  where o.status='OFFERED' and rr.status='OPEN' and o.expires_at is not null
    and o.expires_at > now() and o.expires_at <= now()+interval '25 seconds'
  on conflict(dedupe_key) do nothing;
  get diagnostics v_native_rescue_reminders = row_count;

  return jsonb_build_object(
    'ok',true,'auto_activated',v_auto_activated,'opportunities_withdrawn',v_opp_withdrawn,
    'rescues_expired',v_rescues_expired,'passenger_confirms_expired',v_passenger_expired,
    'passenger_reminders_due',v_reminders_due,
    'driver_booking_reminders_enqueued',v_native_booking_reminders,
    'driver_rescue_reminders_enqueued',v_native_rescue_reminders,
    'decision_seconds',public.taxio_rescue_decision_seconds(),
    'opportunity_seconds',public.taxio_rescue_opportunity_seconds(),
    'passenger_confirm_seconds',public.taxio_rescue_passenger_confirm_seconds(),
    'server_now',now()
  );
end;
$function$;
