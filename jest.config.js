module.exports = {
  transform: {
    '.(ts|tsx)': 'ts-jest'
  },
  testEnvironment: 'node',
  testRegex: '(/__tests__/.*|\\.(test|spec))\\.(tsx?|js)$',
  moduleFileExtensions: ['ts', 'tsx', 'js'],
};
