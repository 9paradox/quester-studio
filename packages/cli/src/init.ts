import {
	type ScaffoldWorkspaceOptions,
	type ScaffoldWorkspaceResult,
	scaffoldWorkspace,
} from "@quester/engine";

export type InitOptions = ScaffoldWorkspaceOptions;
export type InitResult = ScaffoldWorkspaceResult;

/** CLI alias for engine `scaffoldWorkspace`. */
export async function initWorkspace(
	dir: string,
	opts: InitOptions = {},
): Promise<InitResult> {
	return scaffoldWorkspace(dir, opts);
}
