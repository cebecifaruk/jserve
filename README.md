# JServe Library

You can serve your javascript functions with jserve. In order to install the library execute this command:

```
npm install --save @cebecifaruk/jserve
```

After installing the library, create a javascript file

```js
// You do not have to import the library

function sampleFn() {
    return "Hi, this function can not call from the outside";
}

// Exported functions can be called from the outside world
export function exportedFn() {
    return "Hello World"
}

// You can also use async functions
export async function() {
    const delay = t => new Promise((res,rej) => setTimeout(res,t));
    await delay(3000);
}

export function dangerous() {
    throw "This function throws an error";
}
```

You can serve your javascript file like this:

```
npx jserve -w 8080 main.js
```

This command will start an HTTP Server on 8080. You can invoke your functions with these options:

## Invoke by URL (HTTP GET)

The most simple method to invoke a function is just by typing an url to browser (HTTP GET method). You should follow this rules:

```
http://hostname/functionName/argument1/argument2/...
```

for instance, you can call

## Invoke by HTTP POST Request

## Invoke by (Pure) TCP Socket Connection

## Invoke by UDP

## Invoke with Websocket

## Helper Functions

## Roadmap

- SSE support
- Watch file changes
- Serve static content with command line
- Process manager
- JSON Configuration File
- jserve init project-name
