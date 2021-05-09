import { Html, HttpResponse } from "./Types.js";
import mime from "mime-types";
import fs from "fs";
import path from "path";

export function createStatic(root) {
  return async (...params) => {
    const dirs = params.slice(0, -1);
    const file = params[params.length - 1];
    const filePath = path.join(root, ...dirs, file);
    try {
      await fs.promises.access(filePath, fs.R_OK);
    } catch (e) {
      return Html("<h1>Page Not Found</h1>");
    }
    return HttpResponse(
      { "Content-Type": mime.contentType(file) },
      await fs.promises.readFile(filePath)
    );
  };
}

export default createStatic;
