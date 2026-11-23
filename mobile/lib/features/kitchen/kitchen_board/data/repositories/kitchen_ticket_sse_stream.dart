import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:mobile/features/kitchen/kitchen_board/data/models/kitchen_board_ticket.dart';

class KitchenTicketSseStream {
  const KitchenTicketSseStream._();

  static List<KitchenBoardTicket> parseTicketList(
    List<Object?> rawList, {
    DateTime? now,
  }) {
    final referenceTime = now ?? DateTime.now();
    final tickets = <KitchenBoardTicket>[];
    for (final item in rawList) {
      if (item is Map<String, dynamic>) {
        final parsed = KitchenBoardTicket.tryFromApiJson(
          item,
          now: referenceTime,
        );
        if (parsed != null) {
          tickets.add(parsed);
        }
      } else if (item is Map) {
        final parsed = KitchenBoardTicket.tryFromApiJson(
          Map<String, dynamic>.from(item),
          now: referenceTime,
        );
        if (parsed != null) {
          tickets.add(parsed);
        }
      }
    }
    return tickets;
  }

  static List<Object?> extractTicketList(Object? body) {
    if (body is List) {
      return body;
    }
    if (body is Map) {
      final tickets = body['kitchenTickets'] ?? body['data'] ?? body['tickets'];
      if (tickets is List) {
        return tickets;
      }
    }
    throw const FormatException('Invalid kitchen-ticket/today response.');
  }

  static Stream<List<KitchenBoardTicket>> stream({
    required Dio dio,
    required String endpoint,
    required String Function(DioException error) errorMessage,
    DateTime? now,
    CancelToken? cancelToken,
  }) {
    late final StreamController<List<KitchenBoardTicket>> controller;
    StreamSubscription<Uint8List>? bodySub;
    final effectiveCancelToken = CancelToken();

    void cancelInner([String reason = 'Stream cancelled']) {
      if (!effectiveCancelToken.isCancelled) {
        effectiveCancelToken.cancel(reason);
      }
      final sub = bodySub;
      bodySub = null;
      if (sub != null) {
        unawaited(sub.cancel());
      }
    }

    if (cancelToken != null) {
      if (cancelToken.isCancelled) {
        return const Stream<List<KitchenBoardTicket>>.empty();
      }
      cancelToken.whenCancel.then((_) {
        cancelInner('Caller cancelToken cancelled');
        if (!controller.isClosed) {
          unawaited(controller.close());
        }
      });
    }

    List<KitchenBoardTicket> decodePayload(String payload) {
      final decoded = jsonDecode(payload);
      final rawList = extractTicketList(decoded);
      return parseTicketList(rawList, now: now);
    }

    controller = StreamController<List<KitchenBoardTicket>>(
      onListen: () async {
        if (dio.options.baseUrl.trim().isEmpty) {
          controller.addError(
            const FormatException(
              'Stream endpoint requires a configured baseUrl.',
            ),
          );
          await controller.close();
          return;
        }

        final Response<ResponseBody> response;
        try {
          response = await dio.get<ResponseBody>(
            endpoint,
            cancelToken: effectiveCancelToken,
            options: Options(
              responseType: ResponseType.stream,
              headers: const {'Accept': 'text/event-stream'},
              receiveTimeout: Duration.zero,
            ),
          );
        } on DioException catch (error) {
          if (effectiveCancelToken.isCancelled || controller.isClosed) {
            if (!controller.isClosed) await controller.close();
            return;
          }
          controller.addError(FormatException(errorMessage(error)));
          await controller.close();
          return;
        } catch (error, stackTrace) {
          if (!controller.isClosed) {
            controller.addError(error, stackTrace);
            await controller.close();
          }
          return;
        }

        if (effectiveCancelToken.isCancelled || controller.isClosed) {
          if (!controller.isClosed) await controller.close();
          return;
        }

        final responseBody = response.data;
        if (responseBody == null) {
          controller.addError(
            const FormatException(
              'Invalid kitchen-ticket/today/stream response.',
            ),
          );
          await controller.close();
          return;
        }

        final statusCode = response.statusCode ?? responseBody.statusCode;
        if (statusCode < 200 || statusCode >= 300) {
          controller.addError(
            FormatException(
              'Failed to load kitchen tickets. Status: $statusCode',
            ),
          );
          await controller.close();
          return;
        }

        var emittedAny = false;
        var carryOver = '';
        final dataLines = <String>[];
        final rawLines = <String>[];

        void processLine(String rawLine) {
          if (effectiveCancelToken.isCancelled || controller.isClosed) return;
          final line = rawLine.endsWith('\r')
              ? rawLine.substring(0, rawLine.length - 1)
              : rawLine;

          if (line.isEmpty) {
            if (dataLines.isNotEmpty) {
              final payload = dataLines.join('\n').trim();
              dataLines.clear();
              if (payload.isNotEmpty) {
                final tickets = decodePayload(payload);
                emittedAny = true;
                if (!controller.isClosed) {
                  controller.add(tickets);
                }
              }
            }
            return;
          }

          if (line.startsWith(':')) {
            // SSE heartbeat comment (": ping") — ignore.
            return;
          }

          if (line.startsWith('data:')) {
            var value = line.substring(5);
            if (value.startsWith(' ')) {
              value = value.substring(1);
            }
            dataLines.add(value);
            return;
          }

          if (line.startsWith('event:') ||
              line.startsWith('id:') ||
              line.startsWith('retry:')) {
            return;
          }

          rawLines.add(line);
        }

        bodySub = responseBody.stream.listen(
          (chunk) {
            if (effectiveCancelToken.isCancelled || controller.isClosed) return;
            try {
              final decodedChunk = utf8.decode(chunk, allowMalformed: true);
              final combined = carryOver + decodedChunk;
              final parts = combined.split('\n');
              carryOver = parts.removeLast();
              for (final part in parts) {
                processLine(part);
              }
            } catch (error, stackTrace) {
              if (!controller.isClosed) {
                controller.addError(error, stackTrace);
              }
              cancelInner('Decode error');
              if (!controller.isClosed) {
                unawaited(controller.close());
              }
            }
          },
          onError: (Object error, StackTrace stackTrace) {
            if (effectiveCancelToken.isCancelled || controller.isClosed) return;
            controller.addError(error, stackTrace);
            cancelInner('Stream error');
            if (!controller.isClosed) {
              unawaited(controller.close());
            }
          },
          onDone: () {
            if (effectiveCancelToken.isCancelled || controller.isClosed) return;
            try {
              if (carryOver.isNotEmpty) {
                processLine(carryOver);
                carryOver = '';
              }
              if (dataLines.isNotEmpty) {
                final payload = dataLines.join('\n').trim();
                dataLines.clear();
                if (payload.isNotEmpty) {
                  final tickets = decodePayload(payload);
                  emittedAny = true;
                  if (!controller.isClosed) {
                    controller.add(tickets);
                  }
                }
              } else if (!emittedAny && rawLines.isNotEmpty) {
                final payload = rawLines.join('\n').trim();
                rawLines.clear();
                if (payload.isNotEmpty) {
                  final tickets = decodePayload(payload);
                  emittedAny = true;
                  if (!controller.isClosed) {
                    controller.add(tickets);
                  }
                }
              }

              if (!emittedAny && !controller.isClosed) {
                controller.addError(
                  const FormatException(
                    'Invalid kitchen-ticket/today/stream response.',
                  ),
                );
              }
            } catch (error, stackTrace) {
              if (!controller.isClosed) {
                controller.addError(error, stackTrace);
              }
            } finally {
              cancelInner('Stream done');
              if (!controller.isClosed) {
                unawaited(controller.close());
              }
            }
          },
          cancelOnError: true,
        );
      },
      onCancel: () {
        cancelInner('Subscription cancelled');
      },
    );

    return controller.stream;
  }
}
