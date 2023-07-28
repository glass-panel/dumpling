import * as util from "../../libs/util.js";
//import { ScanData } from "../../libs/typedef.js";

import { rawToResponse } from "../../libs/raw_http.js";

const tagger = {
    name: "common_http_app",
    description: "tag the response to a http app",
    id: "common_http_app",
    tags: ["protocol:tcp", "protocol:http"],
    /** @type {(response_buffer:Buffer)=>Promise<string[]>} */
    run: async function(response_buffer) {
        const result = [];
        const response_str = response_buffer.toString("utf-8");
        const response = await rawToResponse(response_buffer).catch(()=>null);
        if(response) {

            switch(true) {
                case response.headers.get("X-elastic-product")?.match(/elasticsearch/i): {
                    result.push("http_app:elasticsearch");
                    const match = response_str.match(/"number"\s*:\s*"(\d+\.\d+\.\d+)"/im);
                    const version = match?.[1];
                    if(version)
                        result.push(`elasticsearch_version:${version}`);
                    break;
                }
                case response.headers.get("X-Powered-By")?.match(/express/i): {
                    result.push("http_app:express");
                    result.push("app_software:nodejs");
                    const match = response.headers.get("X-Powered-By").match(/express\/(\d+\.\d+\.\d+)/i);
                    const version = match?.[1];
                    if(version)
                        result.push(`express_version:${version}`);
                    break;
                }
                case response.headers.get("X-Powered-By")?.match(/ASP.NET/i): {
                    result.push("http_app:aspnet");
                    const version = response.headers.get("X-AspNet-Version");
                    if(version)
                        result.push(`aspnet_version:${version}`);
                    break;
                }
                case response.headers.get("X-Powered-By")?.match(/PHP/i): {
                    result.push("http_app:php");
                    result.push("app_software:php");
                    const version = response.headers.get("X-Powered-By").match(/PHP\/(\d+\.\d+(\.\d+)*)/)?.[1];
                    if(version)
                        result.push(`php_version:${version}`);
                    break;
                }
            }

            const response_str_lower = response_str.toLocaleLowerCase();
            if(response_str_lower.includes(`wordpress`)) {
                let is_wp = false;
                switch(true) {
                    case response_str_lower.includes(`wp-content`):
                        is_wp = true;
                        break;
                    case response_str_lower.includes(`<div class="wp-`):
                        is_wp = true;
                        break;
                }
                if(is_wp) {
                    result.push("http_app:wordpress");
                    const match = response_str_lower.match(/<meta name="generator" content="WordPress (\d+\.\d+(\.\d+)*)"/im);
                    const version = match?.[1];
                    if(version)
                        result.push(`wordpress_version:${version}`);
                }
            } 
            if(response.headers.get("Cookie")?.includes("grafana_sess") || response_str_lower.includes("<title>Grafana</title>".toLowerCase())) {
                result.push("http_app:grafana");
            }

            if(response_str_lower.includes('<title>RabbitMQ Management</title>'.toLowerCase())) {
                result.push("http_app:rabbitmq");
            }
        }
        return result;
    }
};

export default tagger;