import { Router } from 'express'
import {
        createPortfolio,
        deletePortfolio,
        getPortfolioDetail,
        listPortfolios,
        updatePortfolio
} from '~/controllers/freelancer/portfolio.controller'
import authenticateMiddleware from '~/middlewares/authentication'
import optionalAuthentication from '~/middlewares/optional-authentication'
import { errorHandler } from '~/utils/error-handler'

const router: Router = Router()

router.get('/:freelancerId/:portfolioId', optionalAuthentication, errorHandler(getPortfolioDetail))
router.get('/:freelancerId', optionalAuthentication, errorHandler(listPortfolios))
router.post('/:freelancerId', authenticateMiddleware, errorHandler(createPortfolio))
router.put('/:freelancerId/:portfolioId', authenticateMiddleware, errorHandler(updatePortfolio))
router.delete('/:freelancerId/:portfolioId', authenticateMiddleware, errorHandler(deletePortfolio))

export default router
