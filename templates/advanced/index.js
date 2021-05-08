import { Html, Static } from "../index.js";
import path from "path";

export function htmlSample() {
  return Html("<h1>Hello World</h1>");
}

export function simple() {
  return "Hello";
}

export const folder = Static("examples/static");

const delay = (t) => new Promise((res, rej) => setTimeout(res, t));

export async function simpleAsync() {
  await delay(1000);
  return "Hello";
}

export const log = console.log;

export const logStr = (x) => console.log(String(x));

export default function (method, ...args) {
  // This is default function where all non matching requests comes here
}

export const num = 5;
export const str = "string";
export const bool = true;
