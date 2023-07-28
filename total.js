import * as child_process from "child_process";
import * as fs from "fs/promises";
import * as fs from "fs/promises";

const input = [
    '211.22.90.0/31',
    '198.175.7.0/31',
    '211.22.90.0/24',
    '198.175.7.0/24',
    '64.154.25.0/24',
    '43.135.46.0/24',
    '35.206.251.0/24',
    '185.241.5.0/24',
    '165.22.92.0/24',
    '113.30.150.0/24',
    '206.189.61.0/24',
    '24.199.98.0/24',
    '164.92.167.0/24',
    '170.64.148.0/24',
    '165.22.22.0/24',
    '104.248.48.0/24',
    '165.22.17.0/24',
    '170.64.158.0/24',
    '113.30.191.0/24',
    '113.30.151.0/24',
    '45.83.43.0/24',
    '185.139.228.0/24',
    '103.252.118.0/24',
    '185.229.226.0/24',
    '103.252.119.0/24',
    '159.65.5.0/24',
    '134.122.18.0/24',
    '142.93.224.0/24',
    '68.183.177.0/24',
    '81.28.6.0/24',
    '142.93.206.0/24',
    '143.110.240.0/24',
    '143.110.244.0/24',
    '68.183.233.0/24',
    '138.68.173.0/24',
    '68.183.46.0/24',
    '134.122.46.0/24',
    '134.209.202.0/24',
    '64.226.68.0/24',
    '159.65.92.0/24',
    '137.184.166.0/24',
    '83.229.87.0/24'
].filter(i=>i);


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
            create_time = await fs.stat(`./results/${i}`).then(i=> i.mtimeMs);
        } catch(err) {
            console.log(err);
        }
        
        for(const j of Object.keys(obj)) {
            //console.log(obj[j]);
            const [ ip, port ] = j.split(":");
            if(port == 0)
                continue;
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
                host.timestamp = new Date(create_time).toISOString().replace("T", " ").replace("Z", "");
            result_map.set(ip, host);
        }
    }
    const result = {};
    for(const [ip, host_info] of result_map.entries()) {
        result[ip] = host_info;
    }
    await fs.writeFile("./result.json", JSON.stringify(result, null, 2));
}

(async ()=> {
    for(const i of input) {
        const THREAD = 8;
        const config = {
            "thread_cnt": THREAD,
            "concurrency_per_thread": 32,
            "hosts": [ i ]
        };
        await fs.appendFile(`log.txt`, `CONFIG FOR: ${i}\n`);
        await fs.writeFile(`./config.json`, JSON.stringify(config, null, 2));

        const process = child_process.spawn("node", ["./index.js"], {
            stdio: 'inherit'
        });
        const timer = setTimeout(async ()=>{
            process.kill();
            await fs.appendFile(`log.txt`, `KILL: ${i} FOR SPENT TOO MUCH TIME\n`);
        }, 1000*60*60*2); // 2 hours

        process.once("error", async err=> {
            await fs.appendFile(`log.txt`, `PROC: ${i} ${err}\n`);
        });

        const start = Date.now();
        await new Promise((res, rej)=> {
            process.once("exit", res);
        });

        clearTimeout(timer);
        
        for(let n=0; n<THREAD; n++) {
            await fs.rename(`./results/result-${n}.json`, `./results/${i.replace('/','#')}-${n}.json`).catch(async (err)=>{
                await fs.appendFile(`log.txt`, `RENAME: ${i} ${n} ${err}\n`);
            });
        }
        const stop = Date.now();
        await fs.appendFile(`log.txt`, `INPUT: ${i} spent ${(stop-start)/1000}s\n`);
    }
    await do_analyse();
    console.log("***DONE! FINAL RESULT HAS BEEN GENERATED***");
})();