import Handlebars from 'handlebars'
import fs from 'fs'
import path from 'path'

function registerAllPartials(baseDir: string) {
	const dirs = ['partials', 'layouts']
	dirs.forEach(dirName => {
		const dirPath = path.join(baseDir, '/email', dirName)
		if (fs.existsSync(dirPath)) {
			fs.readdirSync(dirPath)
				.filter(f => f.endsWith('.hbs'))
				.forEach(file => {
					const name = file.replace('.hbs', '')
					const content = fs.readFileSync(path.join(dirPath, file), 'utf8')
					Handlebars.registerPartial(name, content)
				})
		}
	})
}

export function renderEmailTemplate(templateName: string, data: any): string {
	const baseDir = path.join(__dirname, '..')
	registerAllPartials(baseDir)
	const templatePath = path.join(baseDir, '/email/templates', templateName)
	const source = fs.readFileSync(templatePath, 'utf8')
	const template = Handlebars.compile(source)
	return template(data)
}
