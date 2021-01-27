export function simple() {
    return "Hello";
}


const delay = t => new Promise((res,rej) => setTimeout(res,t))

export async function simpleAsync() {
    await delay(1000);
    return "Hello"
}

export default function (method, ...args) {
    // This is default function where all non matching requests comes here
}