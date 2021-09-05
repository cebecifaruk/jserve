# JServe Library

You can serve your javascript functions with jserve. In order to install the library execute this command:

```
npm install --save @cebecifaruk/jserve
```

or you can install it globally

```
npm install -g @cebecifaruk/jserve
```

You can create a simple project with

```
jserve init simple-project --template=simple
```

You can list project templates with

```
jserve init --list-templates
```

You can serve your javascript file like this:

```
npm run serve
or
jserve serve index.js
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


## Special Function Names

- default: For 
- index: For HTTP / path

## Helper Functions

You can import helper functions with an import statement:

```
import { Html, Static } from "@cebecifaruk/jserve";
```

Html: Creates an html response for http protocol

```
export function webPage() {
	return Html("<h1>Hello World</h1>");
}
```
```
export const folder = Static("static");
```

## Exported Functions

- export default function (mathod, ...params) {...}
- export function fnName (...params) {...}

## Roadmap

- SSE support
- Serve static content with command line
- Process manager
- JSON Configuration File
- TLS Support
- Rate Limiting
- TypeScript Migration
- Type Check for functions
- createStore
- createPersistantStore
