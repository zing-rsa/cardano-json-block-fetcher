import { Origin, Point } from "@cardano-ogmios/schema";

import { ensureSocketIsOpen, InteractionContext } from "./connection.ts";
import { findIntersection, Intersection } from "./findIntersection.ts";
import { ChainSynchronizationMessageHandlers, handler as handleNextBlock, nextBlock } from "./nextBlock.ts";
import { replacer } from "../util.ts";

// this is a custom version of the lib found below, refactored to work in deno.
// https://github.com/CardanoSolutions/ogmios/tree/master/clients/TypeScript/packages/client/src

export interface ChainSynchronizationClient {
    context: InteractionContext;
    shutdown: () => Promise<void>;
    resume: (
        points?: (Point | Origin)[],
        inFlight?: number,
    ) => Promise<Intersection>;
}

export async function createChainSynchronizationClient(
    context: InteractionContext,
    messageHandlers: ChainSynchronizationMessageHandlers,
): Promise<ChainSynchronizationClient> {
    const { socket } = context;
    return new Promise((resolve) => {
        const messageHandler = async (response: any) => {
            await handleNextBlock(
                response,
                messageHandlers,
                () => nextBlock(socket),
            );
        };

        const responseHandler = messageHandler;

        socket.on("message", async (message: MessageEvent) => {
            await responseHandler(JSON.parse(message.data, replacer));
        });

        return resolve({
            context,
            shutdown: () =>
                new Promise((resolve) => {
                    ensureSocketIsOpen(socket);
                    socket.once("close", resolve);
                    socket.closeForce();
                }),
            resume: async (points, inFlight) => {
                const intersection = await findIntersection(
                    context,
                    points || [await createPointFromCurrentTip(context)],
                );
                for (let n = 0; n < (inFlight || 100); n += 1) {
                    nextBlock(socket);
                }
                return intersection;
            },
        });
    });
}

export class TipIsOriginError extends Error {
    public constructor() {
        super();
        this.message = "Unable to produce point as the chain tip is the origin";
    }
}

export async function createPointFromCurrentTip(
    context: InteractionContext,
): Promise<Point> {
    const { tip } = await findIntersection(context, ["origin"]);
    if (tip === "origin") {
        throw new TipIsOriginError();
    }
    return {
        id: tip.id,
        slot: tip.slot,
    } as Point;
}
