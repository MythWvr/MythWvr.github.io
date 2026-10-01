(() => {
  const SUPABASE_URL = 'https://ijpxbzvzmeswkotnurhj.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_z7TZTTcy2xm0_fkhrgtDIQ_BBTZJCqw';
  const TABLE = 'chapter_comments';
  const pageLoadedAt = Date.now();

  const escapeFilter = (value) => encodeURIComponent(value);

  function formatDate(value) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit'
      }).format(new Date(value));
    } catch {
      return '';
    }
  }

  function renderComment(comment) {
    const article = document.createElement('article');
    article.className = 'reader-comment';

    const head = document.createElement('div');
    head.className = 'reader-comment-head';

    const name = document.createElement('strong');
    name.textContent = comment.display_name;

    const time = document.createElement('time');
    time.dateTime = comment.created_at;
    time.textContent = formatDate(comment.created_at);

    const body = document.createElement('p');
    body.textContent = comment.body;

    head.append(name, time);
    article.append(head, body);
    return article;
  }

  async function loadComments(root) {
    const story = root.dataset.story;
    const chapter = root.dataset.chapter;
    const list = root.querySelector('[data-comment-list]');
    const count = root.querySelector('[data-comment-count]');
    const status = root.querySelector('[data-comment-status]');

    const url = `${SUPABASE_URL}/rest/v1/${TABLE}` +
      `?story_slug=eq.${escapeFilter(story)}` +
      `&chapter_slug=eq.${escapeFilter(chapter)}` +
      `&select=id,display_name,body,created_at&order=created_at.asc`;

    try {
      const response = await fetch(url, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      });
      if (!response.ok) throw new Error('Unable to load comments');
      const comments = await response.json();
      list.replaceChildren();
      comments.forEach((comment) => list.append(renderComment(comment)));
      count.textContent = `${comments.length} comment${comments.length === 1 ? '' : 's'}`;
      if (comments.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'comment-empty';
        empty.textContent = 'No comments yet. You can be the first.';
        list.append(empty);
      }
      status.textContent = '';
    } catch (error) {
      status.textContent = 'Comments could not be loaded right now.';
    }
  }

  async function postComment(root, form) {
    const status = root.querySelector('[data-comment-status]');
    const button = form.querySelector('button[type="submit"]');
    const honeypot = form.elements.website;

    if (honeypot && honeypot.value) return;
    if (Date.now() - pageLoadedAt < 1800) {
      status.textContent = 'Please wait a moment before posting.';
      return;
    }

    const displayName = form.elements.display_name.value.trim();
    const body = form.elements.body.value.trim();
    if (!displayName || !body) {
      status.textContent = 'Please add both a name and a comment.';
      return;
    }

    button.disabled = true;
    status.textContent = 'Posting…';

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({
          story_slug: root.dataset.story,
          chapter_slug: root.dataset.chapter,
          display_name: displayName,
          body
        })
      });
      if (!response.ok) throw new Error('Unable to post comment');
      form.reset();
      status.textContent = 'Comment posted.';
      await loadComments(root);
    } catch (error) {
      status.textContent = 'Your comment could not be posted. Please try again.';
    } finally {
      button.disabled = false;
    }
  }

  document.querySelectorAll('[data-comments]').forEach((root) => {
    const form = root.querySelector('[data-comment-form]');
    if (!form || !root.dataset.story || !root.dataset.chapter) return;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      postComment(root, form);
    });
    loadComments(root);
  });
})();
