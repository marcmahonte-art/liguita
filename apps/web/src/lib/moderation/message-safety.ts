export function isOffPlatformMessage(body: string): boolean {
  const phone = /(?:\+?\d[\s().-]?){7,}/;
  const invitation =
    /(?:hors\s+(?:la\s+)?plateforme|à\s+l[’']?hui|chez\s+moi|mon\s+num[eé]ro|contacte?-moi\s+direct)/i;
  return phone.test(body) || invitation.test(body);
}
