import * as net from "net";
import * as util from "./util.js";
import { Response } from "node-fetch";

/** @param {"GET"|"POST"|"PUT"|"DELETE"|"OPTION"} method @param {string|URL} url */
async function request(method, url, headers={}, body="") {
    const url_obj = new URL(url);
    const socket = net.createConnection({
        host: url_obj.hostname,
        port: url_obj.port,
    });
    const request = [
        `${method} ${url_obj.pathname}${url_obj.search} HTTP/1.1`,
        `Host: ${url_obj.hostname}`,
        ...Object.entries(headers).map(([key, value])=>`${key}: ${value}`),
        "",
        body,
    ].join("\r\n");
    const promise = util.readUntilIdle(socket, 1000, 30000).catch(()=>{});
    socket.write(request);
    const res = await promise;
    return res;
}

/** @param {Response} response */
async function responseToRaw(response) {
    const headers = Object.entries(response.headers.raw()).map(([key, value])=>`${key}: ${value.join(", ")}`).join("\r\n");
    const body = Buffer.from(await response.arrayBuffer());
    const head = Buffer.from(`HTTP/1.1 ${response.status} ${response.statusText}\r\n${headers}\r\n\r\n`);
    return Buffer.concat([head, body]);
}

/** @param {Buffer} raw */
async function rawToResponse(raw) {
    const raw_str = raw.toString("utf-8");
    const first_line = raw_str.split("\r\n")[0];
    const match = first_line.match(/^HTTP\/\d\.\d (\d{3})/);
    if(!match)
        throw new Error("Not a valid http response");
    const status_code = match[1];
    const headers = raw_str.split("\r\n\r\n")[0].split("\r\n").slice(1).map(line=>{
        const [key, ...value] = line.split(":");
        return [key, value.join(":").trim()];
    });
    const body = raw.subarray(raw.indexOf("\r\n\r\n")+4);
    return new Response(body, {
        status: status_code,
        statusText: "",
        headers: Object.fromEntries(headers),
    });
}

export {
    request,
    responseToRaw,
    rawToResponse
};

