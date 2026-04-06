let runRoute = () => {}

export function setRouteRunner(fn) {
  runRoute = fn
}

export function navigate(path) {
  window.history.pushState({}, '', path)
  runRoute()
}
