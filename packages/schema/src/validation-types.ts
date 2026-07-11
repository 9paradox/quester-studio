export type ValidationResult<T> =
	| { success: true; data: T }
	| {
			success: false;
			error: string;
			issues?: { path: string; message: string }[];
	  };
