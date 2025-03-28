import { Era, Tip } from "@cardano-ogmios/schema";

import { Connection } from "./connection.ts";

export interface ServerHealth {
    currentEra: Era;
    lastKnownTip: Tip;
    lastTipUpdate: string | null;
    metrics: {
        runtimeStats?: {
            gcCpuTime: number;
            cpuTime: number;
            maxHeapSize: number;
            currentHeapSize: number;
        };
        sessionDurations: {
            max: number;
            mean: number;
            min: number;
        };
        totalConnections: number;
        totalMessages: number;
        totalUnrouted: number;
        activeConnections: number;
    };
    startTime: string;
    network: "mainnet" | "preview" | "preprod";
    networkSynchronization: number;
    version: string;
}

export const getServerHealth = async (
    options?: {
        connection?: Connection;
    },
): Promise<ServerHealth> => {
    const response = await fetch(`${options?.connection?.address.http}/health`);
    const responseJson = await response.json();
    if (response.ok) {
        return responseJson;
    } else {
        throw new Error(response.statusText);
    }
};

export class ServerNotReady extends Error {
    public constructor(health: ServerHealth) {
        super();
        this.message = `Server is not ready. Network synchronization at ${health.networkSynchronization}%`;
    }
}
