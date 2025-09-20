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
import { uploadPortfolioMedia } from '~/middlewares/multer'
import { errorHandler } from '~/utils/error-handler'

const router: Router = Router()

router.get('/:freelancerId/:portfolioId', optionalAuthentication, errorHandler(getPortfolioDetail))
router.get('/:freelancerId', optionalAuthentication, errorHandler(listPortfolios))
const portfolioMediaFields = uploadPortfolioMedia.fields([
        { name: 'cover', maxCount: 1 },
        { name: 'gallery', maxCount: 12 }
])

router.post('/:freelancerId', authenticateMiddleware, portfolioMediaFields, errorHandler(createPortfolio))
router.put('/:freelancerId/:portfolioId', authenticateMiddleware, portfolioMediaFields, errorHandler(updatePortfolio))
router.delete('/:freelancerId/:portfolioId', authenticateMiddleware, errorHandler(deletePortfolio))

export default router
