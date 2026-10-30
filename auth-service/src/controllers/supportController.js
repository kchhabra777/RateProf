import prisma from '../lib/prisma.js';

const MAX_POST_LENGTH = 2000;
const MAX_COMMENT_LENGTH = 1000;

// Anonymous posts and replies must not leak who wrote them: drop the author and author id
// before they leave the server. isMine lets the client label the viewer's own items.
const toPublic = (item, viewerId) => {
  const { authorId, author, ...rest } = item;
  return {
    ...rest,
    author: item.isAnonymous ? null : author,
    isMine: authorId === viewerId
  };
};

export const getPosts = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const skip = (page - 1) * limit;

    const [posts, totalPosts] = await Promise.all([
      prisma.supportPost.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              studentProfile: { select: { fullName: true, batch: true, branch: true } },
              teacherProfile: { select: { fullName: true, department: true } },
            }
          },
          comments: {
            orderBy: { createdAt: 'asc' },
            include: {
              author: {
                select: {
                  id: true,
                  studentProfile: { select: { fullName: true, batch: true } },
                  teacherProfile: { select: { fullName: true } }
                }
              }
            }
          }
        }
      }),
      prisma.supportPost.count()
    ]);

    const viewerId = req.user.id;
    const publicPosts = posts.map((post) => ({
      ...toPublic(post, viewerId),
      comments: post.comments.map((comment) => toPublic(comment, viewerId))
    }));

    res.json({ posts: publicPosts, totalPosts, page, totalPages: Math.ceil(totalPosts / limit) });
  } catch (error) {
    next(error);
  }
};

export const createPost = async (req, res, next) => {
  try {
    const { content, isAnonymous } = req.body;
    const userId = req.user.id;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Post content cannot be empty' });
    }
    if (content.length > MAX_POST_LENGTH) {
      return res.status(400).json({ error: `Posts can be at most ${MAX_POST_LENGTH} characters.` });
    }

    const post = await prisma.supportPost.create({
      data: {
        content: content.trim(),
        isAnonymous: Boolean(isAnonymous),
        authorId: userId,
      }
    });

    res.status(201).json({ message: 'Post created successfully', post: toPublic(post, userId) });
  } catch (error) {
    next(error);
  }
};

export const upvotePost = async (req, res, next) => {
  try {
    const { id } = req.params;

    const post = await prisma.supportPost.update({
      where: { id },
      data: {
        upvotes: { increment: 1 }
      }
    });

    res.json({ message: 'Post upvoted', post: toPublic(post, req.user.id) });
  } catch (error) {
    next(error);
  }
};

export const addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, isAnonymous } = req.body;
    const userId = req.user.id;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }
    if (content.length > MAX_COMMENT_LENGTH) {
      return res.status(400).json({ error: `Replies can be at most ${MAX_COMMENT_LENGTH} characters.` });
    }

    const comment = await prisma.supportComment.create({
      data: {
        content: content.trim(),
        isAnonymous: Boolean(isAnonymous),
        authorId: userId,
        postId: id
      }
    });

    res.status(201).json({ message: 'Comment added successfully', comment: toPublic(comment, userId) });
  } catch (error) {
    next(error);
  }
};
