import { HttpException } from '@nestjs/common';

import { FileValidatorPipe } from './file-validator.pipe';

describe('FileValidatorPipe', () => {
  const file = (mimetype: string, size: number) =>
    ({ mimetype, size, originalname: 'a.png' }) as Express.Multer.File;
  const options = {
    fileTypeConfig: { type: /^image\/(png|jpeg)$/ },
    maxSizeConfig: { size: 1024 },
  };

  it('returns a valid file', () => {
    const valid = file('image/png', 1024);

    expect(new FileValidatorPipe(options).transform(valid)).toBe(valid);
  });

  it.each([
    ['a wrong mime type', file('text/plain', 10)],
    ['a file over the size limit', file('image/png', 1025)],
    ['a missing required file', undefined],
  ])('rejects %s with 400', (_, input) => {
    expect(() => new FileValidatorPipe(options).transform(input)).toThrow(
      expect.objectContaining({ status: 400 }) as HttpException,
    );
  });

  it('allows a missing optional file', () => {
    const pipe = new FileValidatorPipe({ ...options, fileIsRequired: false });

    expect(pipe.transform(undefined)).toBeUndefined();
  });

  it('refuses a non-positive size limit at construction', () => {
    expect(
      () => new FileValidatorPipe({ maxSizeConfig: { size: 0 } }),
    ).toThrow();
  });
});
