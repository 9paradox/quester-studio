import { describe, expect, test } from "bun:test";
import { indexCollectionResponse, indexNodeOutputs } from "./pathIndex.js";
import { emptyPathShapeIndex } from "./pathShapes.js";

describe("indexNodeOutputs", () => {
	test("indexes paths per node without values", () => {
		const index = indexNodeOutputs(emptyPathShapeIndex(), {
			login: { status: 200, body: { id: 1 } },
		});
		expect(index["nodes.login"]?.paths).toContain("status");
		expect(index["nodes.login"]?.paths).toContain("body.id");
		expect(JSON.stringify(index)).not.toContain('"id":1');
	});
});

describe("indexCollectionResponse", () => {
	test("indexes under collection key", () => {
		const index = indexCollectionResponse(emptyPathShapeIndex(), "auth/login", {
			status: 201,
			body: { token: "secret-value" },
		});
		expect(index["collection.auth/login"]?.paths).toContain("body.token");
		expect(JSON.stringify(index)).not.toContain("secret-value");
	});
});
