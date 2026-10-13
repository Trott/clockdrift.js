import { defineConfig } from 'eslint/config'
import { neostandard } from 'neostandard'
import tseslint from 'typescript-eslint'

export default defineConfig([
  { ignores: ['**/*.d.ts', 'clockdrift.js', 'test.js', 'coverage/**'] },
  ...neostandard({ ts: true }),
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    }
  }
])
