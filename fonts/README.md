# Fonts Directory

## Gilroy Font Setup

To use the Gilroy font in this project, you need to add the following font files to this directory:

- `Gilroy-Regular.woff2` - Regular weight (400)
- `Gilroy-Medium.woff2` - Medium weight (500) 
- `Gilroy-Bold.woff2` - Bold weight (700)

### Alternative Options:

1. **Purchase Gilroy**: Gilroy is a premium font available from [Fontshare](https://www.fontshare.com/fonts/gilroy) or other font marketplaces.

2. **Use Free Alternative**: You can replace Gilroy with a similar free alternative like:
   - **Inter** (already included in the project)
   - **Roboto**
   - **Open Sans**

3. **Web Font**: Use Google Fonts or another web font service.

### Current Configuration:

The project is configured to use Gilroy with the CSS variable `--font-gilroy`. If you don't have the font files, the fallback will be the system sans-serif font.

To change to a different font, update the `app/layout.tsx` file and `tailwind.config.ts` accordingly.
