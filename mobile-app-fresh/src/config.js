import { Platform } from 'react-native';

const normalizeBaseUrl = (value = '') => value.trim().replace(/\/+$/, '');

const envBaseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL || '');

const defaultLocalBaseUrl = Platform.select({
	android: 'http://10.0.2.2:4000',
	ios: 'http://localhost:4000',
	web: 'http://localhost:4000',
	default: 'http://localhost:4000'
});

export const BASE_URL = envBaseUrl || defaultLocalBaseUrl;
