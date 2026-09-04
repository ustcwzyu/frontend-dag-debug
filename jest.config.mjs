// Jest 配置：ESM（"type": "module"）+ `.mjs` 测试发现 + TS 源码导入。
// - 测试发现：testMatch 覆盖 test/*.test.mjs，新增测试文件默认被发现，无需逐文件登记。
// - ESM：package.json scripts.test 经由 node --experimental-vm-modules 启动 jest 入口。
// - TS：src/** 与 server/** 保持原样（erasableSyntaxOnly，可擦除语法）；
//   babel-jest 仅做类型剥离（@babel/preset-typescript），不改运行时语义。
// - server-api 等重型测试保持真实启动语义，不 mock。
export default {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/*.test.mjs'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'mjs', 'js', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': [
      'babel-jest',
      { presets: [['@babel/preset-typescript', { allowDeclareFields: true }]] },
    ],
  },
}
