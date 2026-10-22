import { Logger } from '@nestjs/common';

import { initApplication } from '@/app';

async function bootstrap() {
  const app = await initApplication();

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(`Server is running on port ${port}`, 'Bootstrap');
}
bootstrap();
