import * as util from "../../libs/util.js";
//import { ScanData } from "../../libs/typedef.js";

import { rawToResponse } from "../../libs/raw_http.js";

const tagger = {
    name: "common_http_server",
    description: "tag the response to a http server",
    id: "common_http_server",
    tags: ["protocol:tcp", "protocol:http"],
    /** @type {(response_buffer:Buffer)=>Promise<string[]>} */
    run: async function(response_buffer) {
        const result = [];
        const response_str = response_buffer.toString("utf-8");
        const response = await rawToResponse(response_buffer).catch(()=>null);
        if(response) {
            const header_server = response.headers.get("Server") ?? "";
            switch(true) {
                case header_server?.match(/nginx/i): {
                    result.push("http_server:nginx");
                    const match = header_server.match(/nginx\/(\d+\.\d+\.\d+)*/i);
                    const version = match?.[1];
                    if(version)
                        result.push(`nginx_version:${version}`);
                    break;
                }
                case header_server?.match(/apache/i): {
                    result.push("http_server:apache");
                    const match = header_server.match(/Apache\/(\d+\.\d+\.\d+)/i);
                    const version = match?.[1];
                    if(version)
                        result.push(`apache_version:${version}`);
                    break;
                }
                case header_server?.match(/openresty/i): {
                    result.push("http_server:openresty");
                    const match = header_server.match(/openresty\/(\d+\.\d+(\.\d+)+)/i);
                    const version = match?.[1];
                    if(version)
                        result.push(`openresty_version:${version}`);
                    break;
                }
                case header_server?.match(/micro_httpd/i): {
                    result.push("http_server:microhttpd");
                    const match = header_server.match(/micro_httpd\/(\d+\.\d+\.\d+)/i);
                    const version = match?.[1];
                    if(version)
                        result.push(`microhttpd_version:${version}`);
                    break;
                }
                case header_server?.match(/Microsoft-IIS/i): {
                    result.push("http_server:iis");
                    result.push("system:windows"); 
                    const match = header_server.match(/Microsoft-IIS\/(\d+\.\d+)/i);
                    const version = match?.[1];
                    if(version)
                        result.push(`iis_version:${version}`);
                    break;
                }
                case header_server?.match(/Microsoft-HTTPAPI/i): {
                    result.push("http_server:mshttpapi");
                    result.push("system:windows");
                    const match = header_server.match(/Microsoft-HTTPAPI\/(\d+\.\d+)/i);
                    const version = match?.[1];
                    if(version)
                        result.push(`mshttpapi_version:${version}`);
                    break;
                }
                case header_server?.match(/WebLogic/i): {
                    result.push("http_server:weblogic");
                    const match = header_server.match(/WebLogic Server (\d+\.\d+(\.\d+)*)/i);
                    const version = match?.[1];
                    if(version)
                        result.push(`weblogic_version:${version}`);
                    break;
                }
                case header_server?.match(/Jetty/i): {
                    result.push("http_server:jetty");
                    const match = header_server.match(/Jetty\((\d+(\.\d+)*)\)/i);
                    const version = match?.[1];
                    if(version)
                        result.push(`jetty_version:${version}`);
                    break;
                }
                case header_server?.match(/litespeed/i): {
                    result.push("http_server:litespeed");
                    break;
                }
            }

            switch(true) {
                case header_server.includes("linux") || header_server.includes("docker"):
                    result.push("system:linux");
                    break;
                case header_server.includes("ubuntu"):
                    result.push("system:linux", "system:ubuntu");
                    break;
                case header_server.includes("centos"):
                    result.push("system:linux", "system:centos");
                    break;
                case header_server.includes("debian"):
                    result.push("system:linux", "system:debian");
                    break;
            }
        }
        return result;
    }
};

export default tagger;