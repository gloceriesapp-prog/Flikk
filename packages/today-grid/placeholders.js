export const ALL_PLACEHOLDERS = ['min', 'pct', 'total', 'time', 'cutoff', 'festival'];
export function placeholdersIn(template) {
    return [...template.matchAll(/\{([^{}]*)\}/g)].map(match => match[1] ?? '');
}
// Fill {name} from values; null when any needed value is missing.
export function fill(template, values) {
    let missing = false;
    const out = template.replace(/\{(\w+)\}/g, (_, key) => {
        const value = values[key];
        if (value == null || value === '') {
            missing = true;
            return '';
        }
        return value;
    });
    return missing ? null : out;
}
