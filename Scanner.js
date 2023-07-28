import { Readable } from "stream";
import * as net from "net";
import * as dgram from "dgram";

import * as util from "./libs/util.js"
import * as icmp from "./libs/icmp.js"
import { fucking_ports } from "./libs/PORTS.js";
const DEFAULT_TIMEOUT = 30000;



const common_ports_protocols = [
//    "tcp/21",   // FTP
    "tcp/22",   // SSH
//    "tcp/23",   // Telnet
//    "tcp/25",   // SMTP
//    "tcp/53",   // DNS
//    "tcp/70",   // Gopher
    "tcp/80",   // HTTP
/*    "tcp/110",  // POP3
    "tcp/143",  // IMAP */
    "tcp/443",  // HTTPS 
/*    "tcp/465",  // SMTPS
    "tcp/993",  // IMAPS
    "tcp/995",  // POP3S
    "tcp/1433", // MSSQL*/
    "tcp/3306", // MySQL
//    "tcp/3389", // RDP
//    "tcp/5432", // PostgreSQL
    "tcp/5671", // AMQP tls
    "tcp/5672", // AMQP plain
//    "tcp/5900", // VNC
    "tcp/8080", // HTTP
    "tcp/8443", // HTTPS
    "tcp/8888",
    "tcp/9090", // HTTP
    "tcp/9091", // HTTPS
    "tcp/9999"
//    "tcp/10000",// Webmin
//    "tcp/27017",// MongoDB
];

const scan_strategies = {
    "common_only":  function* (ip_list) {
        for(const ip of ip_list)
            for(const port_protocol of common_ports_protocols)
                yield [ip, port_protocol];
    },
    "common_first": function* (ip_list) {
        for(const ip of ip_list)
            for(const port_protocol of common_ports_protocols)
                yield [ip, port_protocol];
        for(const ip of ip_list)
            for(let port = 1; port <= 65535; port++)
                for(const protocol of ["tcp", "udp"]) {
                    if(common_ports_protocols.includes(`${protocol}/${port}`))
                        continue;
                    yield [ip, `${protocol}/${port}`];
                }
    },
    "full": function* (ip_list) {
        for(const ip of ip_list)
            for(let port = 1; port <= 65535; port++)
                for(const protocol of ["tcp"])
                    yield [ip, `${protocol}/${port}`];
    },
    "fuck": function* (ip_list) {
        for(const ip of ip_list)
            for(const port of fucking_ports)
                yield [ip, `tcp/${port}`];
    }
};

async function tcpPing(ip, port, timeout=undefined) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const conn = net.createConnection({
            host: ip,
            port: port,
            timeout: timeout,
        }, ()=> {
            conn.end();
            const diff = Date.now() - start;
            resolve(diff>0? diff : 0);
        });
        conn.on("error", (err)=> {
            conn.end();
            resolve(-1);
        });
    });
}

class Scanner extends Readable {
    constructor(ip_list, options) {
        super({ objectMode: true });
        this.scan_strategy = options?.scan_strategy in scan_strategies? options.scan_strategy : "common_only";
        this.generator = scan_strategies[this.scan_strategy](ip_list);
    }

    /** @type {Map<string, number|Promise<number>>} */
    host_reachablilities = new Map();

    /** @type {string} */
    scan_strategy = "common_only";

    /** @type {Generator<[string, string], void, void>} */
    generator = undefined;

    async _read() {
        while(true) {
            const next = this.generator.next();
            if(next.done)
                return this.push(null);
            const [ip, port_protocol] = next.value;
            let latency = this.host_reachablilities.get(ip);
            if(latency < 0)
                continue;
            console.log("scanning: ", ip, port_protocol);

            if(latency == undefined) {
                console.log("pinging: ", ip);
                //latency = icmp.ping(ip);
                //this.host_reachablilities.set(ip, latency);
                //latency = await latency;
                latency = 500;
                this.host_reachablilities.set(ip, latency);
                if(latency < 0) {
                    console.log("host unreachable: ", ip);
                    continue;
                }
                console.log("host latency: ", ip, latency)
            }
            if(latency instanceof Promise) {
                latency = await latency;
            }
            return this.push({
                host_info: {
                    ip: ip,
                    port: port_protocol.split("/")[1]-0,
                    latency: latency<=0? DEFAULT_TIMEOUT : latency,
                },
                tags: []
            });
        }
        
    }
};

export {
    Scanner,
    tcpPing,
};