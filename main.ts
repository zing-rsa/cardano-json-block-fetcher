import { Block, BlockPraos, Point } from "@cardano-ogmios/schema";
import "jsr:@std/dotenv/load";

import { createChainSynchronizationClient } from "./ogmios-client/client.ts";
import { createInteractionContext } from "./ogmios-client/connection.ts";
import { replacer } from "./util.ts";

const createContext = () =>
    createInteractionContext(
        (err) => console.error(err),
        () => console.log("Connection closed."),
        {
            connection: {
                host: Deno.env.get("OGMIOS_HOST"),
                port: parseInt(Deno.env.get("OGMIOS_PORT") ?? "443"),
                tls: JSON.parse(Deno.env.get("OGMIOS_USE_TLS") ?? "false"),
            },
        },
    );

async function rollForward (
    { block }: { block: Block },
    requestNextBlock: () => void,
) {
    console.log(`Roll to: ${block.id}`);

    block = block as BlockPraos

    Deno.writeTextFile(`./output/${block.id}.json`, JSON.stringify(block, replacer), { create: true })

    Deno.exit();
};

async function rollBackward ({ point }: { point: Point | "origin" }, requestNextBlock: () => void) {
    console.log(`Roll backward: ${JSON.stringify(point)}`);
    requestNextBlock()
};

async function execute(point: Point) {
    const context = await createContext();
    const client = await createChainSynchronizationClient(context, {
        rollForward,
        rollBackward,
    });
    await client.resume([point], 1);
}

try { await Deno.mkdir('./output', { recursive: true, }) } catch (_) {}

let res: Response;

const url = Deno.env.get("CARDANOSCAN_HOST")
const apiKey = Deno.env.get("CARDANOSCAN_API_KEY")

if (!url || !apiKey) throw new Error("please supply cardanoscan credentials!")

const requestHash = Deno.args[0];

let requestBlock;

try {

    try {
        res = await fetch(url + `/api/v1/block?blockHash=${requestHash}`, { headers: { 'apiKey': apiKey }})
        if (!res.ok) throw new Error(`block request failed: ${res.status}`)
    
        requestBlock = await res.json()
    } catch (e) {
        console.log("block not found, attempting transaction")
        res = await fetch(url + `/api/v1/transaction?hash=${requestHash}`, { headers: { 'apiKey': apiKey }})
        if (!res.ok) throw new Error(`block request failed: ${res.status}`)

        const blockHash = (await res.json()).blockHash
    
        res = await fetch(url + `/api/v1/block?blockHash=${blockHash}`, { headers: { 'apiKey': apiKey }})
        if (!res.ok) throw new Error(`block request failed: ${res.status}`)

        requestBlock = await res.json()
    }

} catch (_) {
    throw new Error("unable to find matching block")
}

const requestBlockHeight = requestBlock.blockHeight

console.log("block height", requestBlockHeight)

const prevBlockHeight = parseInt(requestBlockHeight) - 1

res = await fetch(url + `/api/v1/block?blockHeight=${prevBlockHeight}`, { headers: { 'apiKey': apiKey }})
if (!res.ok) throw new Error(`request failed: ${res.status}`)

const prevBlock = await res.json()

const prevBlockHash = prevBlock.hash
const prevBlockSlot = prevBlock.absSlot

console.log("prev block hash", prevBlockHash, "slot", prevBlockSlot)

execute({id: prevBlockHash, slot: prevBlockSlot});