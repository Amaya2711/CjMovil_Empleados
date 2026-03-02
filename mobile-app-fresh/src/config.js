import { Platform } from 'react-native';

const normalizeBaseUrl = (value = '') => value.trim().replace(/\/+$/, '');

const envBaseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL || '');
const productionBaseUrl = 'https://cjmovilempleados-production.up.railway.app';
const isProductionBuild = typeof __DEV__ !== 'undefined' ? !__DEV__ : false;

const defaultLocalBaseUrl = Platform.select({
	android: 'http://192.168.0.52:4000',
	ios: 'http://localhost:4000',
	web: 'http://localhost:4000',
	default: 'http://localhost:4000'
});

export const BASE_URL = envBaseUrl || (isProductionBuild ? productionBaseUrl : defaultLocalBaseUrl);
