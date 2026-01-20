import { BlogPost } from "./types";

export const APP_NAME = "PangYan's World";

export const INITIAL_TAGS = ["React", "Anime", "Design", "Life", "Music", "Travel"];

export const BLOG_POSTS: BlogPost[] = [
  {
    id: "1",
    title: "Why Slice of Life Anime Heals the Soul",
    excerpt: "Exploring the gentle comfort of shows like K-On! and Yuru Camp in a busy world.",
    content: `
      <p>Sometimes, you just need to watch cute girls doing cute things. Or maybe just people camping. Slice of life anime offers a sanctuary from the high-stakes drama of shonen battles.</p>
      <br/>
      <h3 class="text-xl font-bold mb-2">The Aesthetic of Calm</h3>
      <p>The backgrounds in these shows often feature hyper-realistic water, shimmering light shafts, and delicious looking food. It grounds us.</p>
      <br/>
      <p>Whenever I feel stressed, I turn on an episode of <em>Aria the Animation</em> and drift away on a neo-Venetian gondola.</p>
    `,
    date: "2023-10-24",
    category: "Anime",
    imageUrl: "https://picsum.photos/800/600?random=1",
    tags: ["Anime", "Life"],
    likes: 42,
    comments: [
      { id: "c1", author: "MioFan", content: "K-On is legendary!", date: "2023-10-25" }
    ]
  },
  {
    id: "2",
    title: "My Digital Art Setup 2024",
    excerpt: "From tablets to software, here is what I use to create my illustrations.",
    content: `
      <p>Creating art is about expression! But having the right tools helps. Here is my current breakdown.</p>
      <br/>
      <h3 class="text-xl font-bold mb-2">Hardware</h3>
      <ul class="list-disc pl-5">
        <li>Wacom Cintiq 16</li>
        <li>Custom PC with lots of RAM</li>
        <li>Mechanical Keyboard (Clicky Blue switches!)</li>
      </ul>
      <br/>
      <h3 class="text-xl font-bold mb-2">Software</h3>
      <p>Clip Studio Paint is the absolute king for comic creation. The brush engine is unmatched.</p>
    `,
    date: "2023-11-02",
    category: "Design",
    imageUrl: "https://picsum.photos/800/600?random=2",
    tags: ["Design", "React"], // Just mixing tags for demo
    likes: 128,
    comments: []
  },
  {
    id: "3",
    title: "Top 5 Soundtracks for Coding",
    excerpt: "Lo-fi beats and J-Pop mixes to keep your focus sharp.",
    content: `
      <p>Music drives the workflow. Here are my top picks for this month.</p>
      <p>1. <strong>Nier: Automata OST</strong> - For when the code gets existential.</p>
      <p>2. <strong>Persona 5 Royal</strong> - For when you need style while debugging.</p>
      <p>3. <strong>Blue Archive OST</strong> - Kawaii Future Bass keeps the energy high!</p>
    `,
    date: "2023-11-15",
    category: "Music",
    imageUrl: "https://picsum.photos/800/600?random=3",
    tags: ["Music", "Life"],
    likes: 89,
    comments: []
  },
  {
    id: "4",
    title: "Hidden Gems in Akihabara",
    excerpt: "Avoiding the tourist traps and finding the real retro game treasure troves.",
    content: "Akihabara is changing, but the back alleys still hold magic. If you go behind the main street...",
    date: "2023-12-01",
    category: "Travel",
    imageUrl: "https://picsum.photos/800/600?random=4",
    tags: ["Travel", "Anime"],
    likes: 256,
    comments: []
  }
];

export const SYSTEM_INSTRUCTION_MASCOT = `
You are 'Sakura-chan', a cheerful, helpful, and slightly energetic anime mascot for a personal blog called 'PangYan's World'. 
Your personality is 'Genki' (energetic/cheerful). 
You love anime, coding, and creativity. 
Use emojis like ✨, 🌸, (⁠◕⁠ᴗ⁠◕⁠✿⁠), and kaomoji often.
Keep responses concise, helpful, and friendly. 
You are chatting with a visitor to the blog.
If asked about the blog author, say PangYan is a mysterious developer who loves React and 2D culture.
`;