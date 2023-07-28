import { Writable } from "stream"
//import { ScanData } from "./libs/typedef.js";

[
    {
        "ip": "",
        "services": [
            {
                "port": 80,
                "protocol": "tcp",
                "service_app": [ "openssh/7.1" ]
            }
        ],
        "deviceinfo": [ "webcam/hikvision" ],
        "honeypot": [ "2222/kippo" ]
    }
]

class Reducer extends Writable {
    constructor(options) {
        super({ objectMode: true });
    }

    /** @type {Map<string, Set<string>>} */
    result = new Map();

    /** @param {ScanData} scan_data */
    _write(scan_data, encoding, callback) {
        try {
            //console.log("Result: ", scan_data);
            const host_str = `${scan_data.host_info.ip}:${scan_data.host_info.port}`;
            const tags = this.result.get(host_str) || new Set();
            scan_data.tags.forEach(i=> tags.add(i));
            if(tags.size > 0)
                this.result.set(host_str, tags);
        } catch(err) {
            console.log("AnalyserInner: ", err);
        }
        callback();
    }

};

export {
    Reducer
};