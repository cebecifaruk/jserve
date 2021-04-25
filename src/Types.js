import mime from "mime-types";
import fs from "fs";
import path from "path";

export function Html(body = "", headers = {}) {
  return {
    type: "HttpResponse",
    headers: {
      "Content-Type": "text/html",
    },
    body,
  };
}

export function Static(root) {
  return async (...params) => {
    const dirs = params.slice(0, -1);
    const file = params[params.length - 1];
    const filePath = path.join(root, ...dirs, file);
    try {
      await fs.promises.access(filePath, fs.R_OK);
    } catch (e) {
      return Html("<h1>Page Not Found</h1>");
    }
    return {
      type: "HttpResponse",
      headers: {
        "Content-Type": mime.contentType(file),
      },
      body: await fs.promises.readFile(filePath),
    };
  };
}
