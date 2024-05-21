export function fetch_(input: string | URL | Request, init?: RequestInit) {
  if (globalThis.jinjaParsed) {
    if (
      input instanceof Request &&
      /^(GET|HEAD|OPTIONS|TRACE)/i.test(input.method)
    ) {
      input.headers.set("X-CSRFToken", globalThis.csrfToken);
    } else if (init?.method && !/GET|HEAD|OPTIONS|TRACE/i.test(init.method)) {
      init.headers = {
        ...(init.headers ?? {}),
        "X-CSRFToken": globalThis.csrfToken,
      };
    }
  } else {
    if (!init) init = {};
    init.mode = "cors";
    init.credentials = "include";
  }
  return fetch(input, init);
}
