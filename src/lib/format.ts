/** Formats an ISO timestamp as `YYYY-MM-DD HH:mm UTC`, independent of the viewer's locale. */
export function formatUtc(iso: string | null): string {
	if (!iso) return '-';
	return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

/** Formats a `YYYY-MM-DD` day as a short axis label such as `Oct 19`. */
export function shortDay(day: string): string {
	const months = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec'
	];
	const [, month, date] = day.split('-').map(Number);
	return `${months[month - 1]} ${date}`;
}
