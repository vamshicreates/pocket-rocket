# Pocket Rockkets website

A static, no-build site for the film *Pocket Rockkets* (in cinemas Dec 11).

- **Hero:** the YouTube teaser (https://youtu.be/T3EZyINfUwg) inside a gold frame.
- **Deck game:** every press builds a fresh 52-card deck, shuffles it with `crypto.getRandomValues` and deals two cards. Two aces (pocket rockets) unlock the gift. The odds are 1 in 221.
- **Instagram:** profile, the reels and the post, and every account tagged on the film's posts, all linked.

## Run it

Open `index.html` in a browser, or serve the folder: `npx serve .`

## Change the gift

Edit the `GIFT` object at the top of `game.js`. The default gift is a downloadable "Jackpot pass" image with the player's two aces and a unique code.

## Deploy

Static files only. On Vercel, import the repo with the **Other** framework preset and no build command.

Built by [Vamshi Creates](https://vamshicreates.tech).
