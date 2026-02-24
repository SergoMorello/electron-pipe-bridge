import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts'], // Точка входа вашего пакета
	format: ['cjs', 'esm'],  // Собираем и для старого Node (CJS), и для нового веба (ESM)
	dts: true,               // Генерировать файлы типов .d.ts автоматически
	splitting: false,
	sourcemap: true,
	clean: true,             // Очищать папку dist перед каждой сборкой
	
	// КРИТИЧЕСКИ ВАЖНО: помечаем системные модули как внешние
	external: [
		'electron',
		'child_process',
		'fs',
		'path'
	],
	
	// Если нужно, чтобы пакет работал в браузере без ошибок:
	platform: 'node', // Для Node-версии
	// Можно добавить отдельный билд для браузера, если логика сильно отличается
});
