import moment from 'moment';

export const toVNTimzone = (date) => moment(date).utcOffset('+0700');
