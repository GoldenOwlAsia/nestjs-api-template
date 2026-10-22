import { Regex } from '@/utils/constants';

describe('enum regexes', () => {
  it.each([
    [
      Regex.GENDER,
      ['MALE', 'FEMALE', 'OTHER'],
      ['male', 'XMALEX', 'MALE ', '0', ''],
    ],
    [
      Regex.USER_ROLE,
      ['CUSTOMER', 'ADMIN'],
      ['customer', 'SUPERADMIN', 'ADMINS', '1'],
    ],
  ])('%s matches only exact enum keys', (pattern, valid, invalid) => {
    const regex = new RegExp(pattern);

    valid.forEach((value) => expect(regex.test(value)).toBe(true));
    invalid.forEach((value) => expect(regex.test(value)).toBe(false));
  });
});
