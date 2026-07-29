import { FFIType, type Pointer, dlopen, ptr } from "bun:ffi";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const WM_SETICON = 0x0080;
const ICON_SMALL = 0;
const ICON_BIG = 1;
const IMAGE_ICON = 1;
const LR_LOADFROMFILE = 0x0010;
const LR_DEFAULTSIZE = 0x0040;
const DWMWA_USE_IMMERSIVE_DARK_MODE = 20;
const DWMWA_CAPTION_COLOR = 35;
const DWMWA_TEXT_COLOR = 36;
const SWP_NOSIZE = 0x0001;
const SWP_NOMOVE = 0x0002;
const SWP_NOZORDER = 0x0004;
const SWP_NOACTIVATE = 0x0010;
const SWP_FRAMECHANGED = 0x0020;

/** Approx app `bg-background` in dark mode (oklch-ish charcoal → BGR COLORREF). */
const DARK_CAPTION_BGR = 0x00141414;
const DARK_TEXT_BGR = 0x00fafafa;
const LIGHT_CAPTION_BGR = 0x00ffffff;
const LIGHT_TEXT_BGR = 0x00141414;

type Fn = (...args: never[]) => unknown;

type WinApis = {
	SendMessageW: (
		hwnd: Pointer,
		msg: number,
		wParam: bigint,
		lParam: Pointer,
	) => unknown;
	LoadImageW: (
		hInst: null,
		name: Pointer,
		type: number,
		cx: number,
		cy: number,
		fuLoad: number,
	) => Pointer | null;
	DestroyIcon: (handle: Pointer) => unknown;
	SetWindowPos: (
		hwnd: Pointer,
		insertAfter: null,
		x: number,
		y: number,
		cx: number,
		cy: number,
		flags: number,
	) => unknown;
	DwmSetWindowAttribute: (
		hwnd: Pointer,
		attr: number,
		value: Pointer,
		size: number,
	) => unknown;
};

let apis: WinApis | null = null;
let attachedHwnd: Pointer | null = null;
let loadedSmallIcon: Pointer | null = null;
let loadedBigIcon: Pointer | null = null;

function asFn<T extends Fn>(value: unknown): T {
	return value as T;
}

function loadApis(): WinApis | null {
	if (process.platform !== "win32") return null;
	if (apis) return apis;
	try {
		const user32 = dlopen("user32.dll", {
			SendMessageW: {
				args: [FFIType.ptr, FFIType.u32, FFIType.u64, FFIType.ptr],
				returns: FFIType.i64,
			},
			LoadImageW: {
				args: [
					FFIType.ptr,
					FFIType.ptr,
					FFIType.u32,
					FFIType.i32,
					FFIType.i32,
					FFIType.u32,
				],
				returns: FFIType.ptr,
			},
			DestroyIcon: {
				args: [FFIType.ptr],
				returns: FFIType.i32,
			},
			SetWindowPos: {
				args: [
					FFIType.ptr,
					FFIType.ptr,
					FFIType.i32,
					FFIType.i32,
					FFIType.i32,
					FFIType.i32,
					FFIType.u32,
				],
				returns: FFIType.i32,
			},
		});
		const dwmapi = dlopen("dwmapi.dll", {
			DwmSetWindowAttribute: {
				args: [FFIType.ptr, FFIType.u32, FFIType.ptr, FFIType.u32],
				returns: FFIType.i32,
			},
		});
		apis = {
			SendMessageW: asFn(user32.symbols.SendMessageW),
			LoadImageW: asFn(user32.symbols.LoadImageW),
			DestroyIcon: asFn(user32.symbols.DestroyIcon),
			SetWindowPos: asFn(user32.symbols.SetWindowPos),
			DwmSetWindowAttribute: asFn(dwmapi.symbols.DwmSetWindowAttribute),
		};
		return apis;
	} catch (err) {
		console.warn("[windowChrome] Failed to load Win32 APIs:", err);
		return null;
	}
}

function toWStringBuffer(value: string): Buffer {
	const buf = Buffer.alloc((value.length + 1) * 2);
	buf.write(value, 0, "utf16le");
	return buf;
}

export function resolveAppIconPath(): string | null {
	const here = dirname(fileURLToPath(import.meta.url));
	const candidates = [
		join(process.cwd(), "assets", "icon.ico"),
		join(process.cwd(), "apps", "desktop", "assets", "icon.ico"),
		join(here, "..", "..", "assets", "icon.ico"),
		join(dirname(process.execPath), "Resources", "app.ico"),
		join(dirname(process.execPath), "..", "Resources", "app.ico"),
		join(process.cwd(), "Resources", "app.ico"),
	];
	for (const candidate of candidates) {
		if (existsSync(candidate)) return candidate;
	}
	return null;
}

function isNullHandle(handle: Pointer | null | number | bigint): boolean {
	return handle === null || handle === 0 || handle === 0n;
}

function destroyIcon(handle: Pointer | null) {
	if (!handle || !apis || isNullHandle(handle)) return;
	try {
		apis.DestroyIcon(handle);
	} catch {
		/* ignore */
	}
}

function applyWindowIcon(hwnd: Pointer) {
	const win = loadApis();
	if (!win) return;

	const iconPath = resolveAppIconPath();
	if (!iconPath) {
		console.warn("[windowChrome] App icon not found (assets/icon.ico)");
		return;
	}

	const pathBuf = toWStringBuffer(iconPath);
	const small = win.LoadImageW(
		null,
		ptr(pathBuf),
		IMAGE_ICON,
		16,
		16,
		LR_LOADFROMFILE,
	);
	const big = win.LoadImageW(
		null,
		ptr(pathBuf),
		IMAGE_ICON,
		0,
		0,
		LR_LOADFROMFILE | LR_DEFAULTSIZE,
	);

	if (isNullHandle(small) && isNullHandle(big)) {
		console.warn(`[windowChrome] LoadImageW failed for ${iconPath}`);
		return;
	}

	if (small && !isNullHandle(small)) {
		win.SendMessageW(hwnd, WM_SETICON, BigInt(ICON_SMALL), small);
		destroyIcon(loadedSmallIcon);
		loadedSmallIcon = small;
	}
	if (big && !isNullHandle(big)) {
		win.SendMessageW(hwnd, WM_SETICON, BigInt(ICON_BIG), big);
		destroyIcon(loadedBigIcon);
		loadedBigIcon = big;
	}
}

function setDwAttribute(
	hwnd: Pointer,
	attribute: number,
	value: Int32Array,
): void {
	const win = loadApis();
	if (!win) return;
	win.DwmSetWindowAttribute(hwnd, attribute, ptr(value), value.byteLength);
}

export function setTitleBarDarkMode(hwnd: Pointer, dark: boolean): void {
	const win = loadApis();
	if (!win) return;

	const mode = new Int32Array([dark ? 1 : 0]);
	setDwAttribute(hwnd, DWMWA_USE_IMMERSIVE_DARK_MODE, mode);

	// Win 11 caption/text colors — ignored on older builds.
	const caption = new Int32Array([dark ? DARK_CAPTION_BGR : LIGHT_CAPTION_BGR]);
	const text = new Int32Array([dark ? DARK_TEXT_BGR : LIGHT_TEXT_BGR]);
	setDwAttribute(hwnd, DWMWA_CAPTION_COLOR, caption);
	setDwAttribute(hwnd, DWMWA_TEXT_COLOR, text);

	win.SetWindowPos(
		hwnd,
		null,
		0,
		0,
		0,
		0,
		SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED,
	);
}

export function applyWindowChrome(
	hwnd: Pointer,
	options: { dark: boolean },
): void {
	if (process.platform !== "win32") return;
	attachedHwnd = hwnd;
	try {
		applyWindowIcon(hwnd);
		setTitleBarDarkMode(hwnd, options.dark);
	} catch (err) {
		console.warn("[windowChrome] Failed to apply window chrome:", err);
	}
}

export function setAttachedTitleBarDarkMode(dark: boolean): void {
	if (!attachedHwnd) return;
	try {
		setTitleBarDarkMode(attachedHwnd, dark);
	} catch (err) {
		console.warn("[windowChrome] Failed to update title bar theme:", err);
	}
}
