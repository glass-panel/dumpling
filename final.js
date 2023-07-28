import * as fs from "fs/promises";

function createHost() {
    return {
        services: [],
        deviceinfo: [],
        honeypot: [],
        timestamp: new Date()
    };
}

/** @param {string[]} tags @param {string} tag_name */
function getTagValue(tags, tag_name) {
    return tags.filter(i=> i.startsWith(`${tag_name}:`))
        .map(i=> i.split(":")[1]);
}

/** @param {ScanData} scan_data */
function handleServices(scan_data) {
    const protocols = getTagValue(scan_data.tags, "protocol");
    let server_full = [], app_full = [];
    protocols.map(protocol=> {
        const servers = scan_data.tags
            .filter(i=> i.startsWith(`${protocol}_server:`))
            .map(i=> i.split(":")[1]);
        server_full = servers.map((server, n)=> {
            let version = scan_data.tags
                .find(i=> i.startsWith(`${server.toLowerCase()}_version:`))
                ?.split(":")[1] || "N";
            if(server == "openssh")
                version = version.split("p")[0];
            return `${server}/${version}`;
        });
        if(!["tcp","ssh","tls","http","https"].includes(protocol)) {
            const version = scan_data.tags.find(i=> i.startsWith(`${protocol}_version:`))?.split(":")[1] || "N";
            server_full.push(`${protocol}/${version}`);
        }
        const apps = scan_data.tags
            .filter(i=> i.startsWith(`${protocol}_app:`))
            .map(i=> i.split(":")[1]);
        app_full = apps.map((app, n)=> {
            const version = scan_data.tags
                .find(i=> i.startsWith(`${app.toLowerCase()}_version:`))
                ?.split(":")[1] || "N";
            return `${app}/${version}`;
        });
    });
    const systems = scan_data.tags
        .filter(i=> i.startsWith(`system:`))
        .map(i=> i.split(":")[1]);
    const system = systems.find(i=> ["windows","centos", "ubuntu"].includes(i.toLowerCase())) || "";
    const services = [...server_full, ...app_full];
    if(system != "")
        services.push(`${system}/N`);
    const protocol = protocols.includes("https")? "https" : protocols.find(i=> i!="tcp");
    return { 
        port: scan_data.host_info.port, 
        protocol: protocol || null, 
        service_app: services.length > 0? services : null
    };
}

async function do_analyse() {

    const result_map = new Map();
    const result_names = await fs.readdir("./results").catch(()=> []);
    for(const i of result_names) {
        let obj = {};
        let create_time = 0;
        try {
            obj = JSON.parse(await fs.readFile(`./results/${i}`));
            create_time = await fs.stat(`./results/${i}`).then(i=> i.birthtimeMs);
        } catch(err) {
            console.log(err);
        }
        
        for(const j of Object.keys(obj)) {
            //console.log(obj[j]);
            const [ ip, port ] = j.split(":");
            if(port == 0)
                continue;
            if(port == 3306 && obj[j].includes("protocol:tcp") && !obj[j].includes("protocol:mysql")) {
                console.log("find one", ip);
                obj[j].push("protocol:mysql");
            }
            const host = result_map.get(ip) || createHost();
            const service = handleServices({
                host_info: {
                    ip,
                    port: port-0,
                    latency: 0
                },
                tags: obj[j]
            });
            host.services.push(service);
            host.deviceinfo = null;
            host.honeypot = null;
            if(create_time > 0)
                host.timestamp = new Date(create_time).toISOString().replace("T", " ").replace("Z", "").split(".")[0];
            result_map.set(ip, host);
        }
    }
    const result = {};
    for(const [ip, host_info] of result_map.entries()) {
        result[ip] = host_info;
    }
    await fs.writeFile("./final.json", JSON.stringify(result, null, 2));
}

do_analyse();