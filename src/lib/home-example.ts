import { HOME_EXAMPLE } from "@/config/site";
import { articleName } from "@/lib/format";
import { loadLaws } from "@/lib/retrieval/corpus";

export interface HomeExample {
  question: string;
  answer: typeof HOME_EXAMPLE.answer;
  article: string;
  law: string;
  quote: { before: string; mark: string; after: string };
  url: string;
}

export function getHomeExample(): HomeExample {
  const { question, answer, articleId, highlight } = HOME_EXAMPLE;
  const law = loadLaws().find((l) => l.articles.some((a) => a.id === articleId))!;
  const article = law.articles.find((a) => a.id === articleId)!;
  // The inciso that holds the highlight, without "a) " and the final period
  const line = article.text.split("\n").find((l) => l.includes(highlight));
  if (!line) throw new Error(`"${highlight}" is not in ${articleId}`);
  const sentence = line.replace(/^[a-z]\)\s*/, "").replace(/\.$/, "");
  const [before, after] = sentence.split(highlight);
  return {
    question,
    answer,
    article: articleName(article.label),
    law: `Ley ${law.number}`,
    quote: { before, mark: highlight, after },
    url: law.textUrl,
  };
}
