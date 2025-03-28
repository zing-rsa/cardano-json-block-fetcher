import { WebSocketClient } from "https://deno.land/x/websocket@v0.1.4/mod.ts";
import { Block, Ogmios, Origin, Point, Tip } from "@cardano-ogmios/schema";

import { baseRequest, Mirror } from "./connection.ts";

export interface ChainSynchronizationMessageHandlers {
    rollBackward(
        response: {
            point: Point | Origin;
            tip: Tip | Origin;
        },
        nextBlock: () => void,
    ): Promise<void>;
    rollForward(
        response: {
            block: Block;
            tip: Tip | Origin;
        },
        nextBlock: () => void,
    ): Promise<void>;
}

export function nextBlock(
    socket: WebSocketClient,
    options?: { id?: Mirror },
): void {
    return socket.send(JSON.stringify(
        {
            ...baseRequest,
            method: "nextBlock",
            id: options?.id,
        } as Ogmios["NextBlock"],
    ));
}

export async function handler(
    response: any,
    messageHandlers: ChainSynchronizationMessageHandlers,
    cb: () => void,
) {
    if (isNextBlockResponse(response)) {
        switch (response.result.direction) {
            case "backward":
                return await messageHandlers.rollBackward({
                    point: response.result.point,
                    tip: response.result.tip,
                }, cb);
            case "forward":
                return await messageHandlers.rollForward({
                    block: response.result.block,
                    tip: response.result.tip,
                }, cb);
            default:
                break;
        }
    }
}

export function isNextBlockResponse(
    response: any,
): response is Ogmios["NextBlockResponse"] {
    return typeof (response as Ogmios["NextBlockResponse"])?.result?.direction !==
        "undefined";
}
