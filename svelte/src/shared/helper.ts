export function fetch_(input: string | URL | Request, init?: RequestInit) {
  if (globalThis.jinjaParsed) {
    if (
      input instanceof Request &&
      /^(GET|HEAD|OPTIONS|TRACE)/i.test(input.method)
    ) {
      input.headers.set("X-CSRFToken", globalThis.csrfToken);
    }
    if (init?.method && !/GET|HEAD|OPTIONS|TRACE/i.test(init.method)) {
      init.headers = {
        ...(init.headers ?? {}),
        "X-CSRFToken": globalThis.csrfToken,
      };
    }
  } else {
    const url = input instanceof Request ? input.url : input;
    // If the URL in relative (not absolute):
    if (!URL.canParse(url)) {
      const newURL = new URL(url, import.meta.env.VITE_DEV_FLASK_SERVER);
      if (input instanceof Request) input = new Request(newURL, input);
      else input = newURL;
    }
    // "init" overrides options set in an "input" of type Request
    init ??= {};
    init.mode = "cors";
    init.credentials = "include";
  }

  return fetch(input, init);
}
