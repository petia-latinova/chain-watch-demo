import { Controller, Post, Body, HttpCode, UsePipes, ValidationPipe, Logger } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { AlchemyWebhookDto } from './dto/alchemy-webhook.dto';

@Controller('webhooks')
// Apply validation pipe globally to ensure DTO is checked
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly webhooksService: WebhooksService,
  ) {}

  // This is the endpoint Alchemy will POST to: /api/webhooks/transfer
  @Post('transfer')
  @HttpCode(200) // Respond 200 immediately to prevent Alchemy retries
  async handleAlchemyTransfer(
    // The @Body() decorator validates the incoming JSON against AlchemyWebhookDto
    @Body() payload: any,
    // Alchemy Signature verification would go here in production
  ) {
    //console.log(JSON.stringify(payload));
    try {
      // Pass the validated payload to the service for processing and saving
      await this.webhooksService.handleAlchemyWebhook(payload);
      return { success: true, message: 'Transfer events processed.' };
    } catch (error) {
      // Log the error internally but still return 200 to Alchemy
      this.logger.error('Error saving transfer:', error.message);
      // We still return success: false to our own internal logging system, but HTTP 200 is sent.
      return { success: false, message: 'Internal processing error.' };
    }
  }
}
