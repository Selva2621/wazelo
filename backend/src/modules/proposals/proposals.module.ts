import { Module } from '@nestjs/common';
import { AiModule } from '@/modules/ai/ai.module';
import { BillingModule } from '@/modules/billing/billing.module';
import { DealsModule } from '@/modules/deals/deals.module';
import { MessagesModule } from '@/modules/messages/messages.module';
import { ProposalRepository } from './infrastructure/repositories/proposal.repository';
import { ManageProposalsUseCase } from './application/use-cases/manage-proposals.use-case';
import { DraftProposalUseCase } from './application/use-cases/draft-proposal.use-case';
import { ImproveProposalUseCase } from './application/use-cases/improve-proposal.use-case';
import { ProposalPdfUseCase } from './application/use-cases/proposal-pdf.use-case';
import { SendProposalUseCase } from './application/use-cases/send-proposal.use-case';
import { RespondProposalUseCase } from './application/use-cases/respond-proposal.use-case';
import { ProposalsController, PublicProposalsController } from './interfaces/controllers/proposals.controller';

/** Quotes sent to clients: AI draft, WhatsApp send, public accept / request-changes link. */
@Module({
  imports: [AiModule, BillingModule, DealsModule, MessagesModule],
  controllers: [ProposalsController, PublicProposalsController],
  providers: [
    ProposalRepository,
    ManageProposalsUseCase,
    DraftProposalUseCase,
    ImproveProposalUseCase,
    ProposalPdfUseCase,
    SendProposalUseCase,
    RespondProposalUseCase,
  ],
})
export class ProposalsModule {}
