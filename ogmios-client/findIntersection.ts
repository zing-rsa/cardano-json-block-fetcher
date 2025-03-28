import { IntersectionFound, Ogmios, Origin, Point, Tip } from "@cardano-ogmios/schema";

import { InteractionContext, Method } from "./connection.ts";

export type Intersection = {
    intersection: Point | Origin;
    tip: Tip | Origin;
};

export function findIntersection(
    context: InteractionContext,
    points: (Point | Origin)[],
): Promise<Intersection> {
    return Method<Ogmios["FindIntersection"], any, Intersection>(
        {
            method: "findIntersection",
            params: {
                points,
            },
        },
        {
            handler: (response, resolve, reject) => {
                if (isIntersectionFound(response)) {
                    resolve(response.result);
                } else {
                    reject(response);
                }
            },
        },
        context,
    );
}

export function isIntersectionFound(
    response: any,
): response is IntersectionFound {
    return (response as IntersectionFound)?.result?.intersection !== undefined;
}
