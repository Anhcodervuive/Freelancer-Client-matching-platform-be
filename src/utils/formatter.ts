// Chỉ thêm key khi có giá trị khác undefined
export const omitUndefined = <T extends Record<string, any>>(obj: T): {} | null =>
	Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>

// Chuẩn hoá string: '' -> null, '  text  ' -> 'text', undefined -> undefined
export const normStr = (v: unknown) => {
	if (v === undefined) return undefined
	if (v === null) return null
	const s = String(v).trim()
	return s.length ? s : null
}
