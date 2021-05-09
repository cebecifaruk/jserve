export function HttpRequest(headers, body) {
  return {
    __proto__: HttpRequest.prototype,
    headers,
    body,
  };
}

export function HttpResponse(headers, body) {
  return {
    __proto__: HttpResponse.prototype,
    type: "HttpResponse",
    headers,
    body,
  };
}

export function Html(body = "", headers = {}) {
  return HttpResponse(
    {
      "Content-Type": "text/html",
    },
    body
  );
}

export function HtmlElement(type, props, ...children) {
  return {
    __proto__: HtmlElement.prototype,
    type,
    props,
    children,
  };
}
