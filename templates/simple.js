import { Html, Static } from "@cebecifaruk/jserve";

// You do not have to import the library if you do not want to
// use helper functions such as Html, Static

export function index(...params) {
  return Html(`<html><head></head><body>
  <h1>Server is running</h1>
  <p>Hi, this function was invoked with these parameters: ${params}</p>
  </body>`);
}

// You can also use async functions
export async function delaySample() {
  const delay = (t) => new Promise((res, rej) => setTimeout(res, t));
  await delay(1000);
  return null;
}

export function helloworld() {
  return "Hello World";
}

export function print(...params) {
  console.log(...params);
}

// Exported functions can be called from the outside world
export function exportedFn() {
  return "Hello World";
}

export function dangerous() {
  throw "This function throws an error";
}

//export const folder = Static("examples/static");

export default function (method, ...params) {
  return `${method} (${params.join(", ")}) couldn't found`;
}
